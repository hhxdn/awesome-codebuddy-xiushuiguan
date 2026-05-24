package com.xiushuiguan.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.xiushuiguan.entity.GameConfig;
import com.xiushuiguan.mapper.GameConfigMapper;
import com.xiushuiguan.service.GameConfigService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class GameConfigServiceImpl extends ServiceImpl<GameConfigMapper, GameConfig> implements GameConfigService {

    @Override
    public List<GameConfig> getAllConfigs() {
        return list();
    }

    @Override
    public boolean updateConfig(String configKey, String configValue) {
        LambdaQueryWrapper<GameConfig> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(GameConfig::getConfigKey, configKey);
        GameConfig config = getOne(wrapper);

        if (config != null) {
            config.setConfigValue(configValue);
            config.setUpdatedAt(LocalDateTime.now());
            return updateById(config);
        }

        config = new GameConfig();
        config.setConfigKey(configKey);
        config.setConfigValue(configValue);
        config.setDescription("");
        config.setUpdatedAt(LocalDateTime.now());
        return save(config);
    }
}
